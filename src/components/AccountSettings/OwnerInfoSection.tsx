import React, { memo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface OwnerInfoSectionProps {
  formData: {
    name: string;
    email: string;
  };
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  onInputChange: (field: string, value: string) => void;
  onPasswordChange: (field: string, value: string) => void;
  onChangePassword: () => Promise<void>;
}

const OwnerInfoSection: React.FC<OwnerInfoSectionProps> = memo(({
  formData,
  passwordData,
  onInputChange,
  onPasswordChange,
  onChangePassword
}) => {
  const { t } = useLanguage();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const isPasswordChangeDisabled = !passwordData.currentPassword || 
    !passwordData.newPassword || 
    !passwordData.confirmPassword;

  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {t('ownerInformation')}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('ownerName')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
            placeholder="Enter owner's name"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('emailAddress')}</label>
          <input
            type="email"
            value={formData.email}
            readOnly
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-600 mt-1">{t('emailCannotBeChanged')}</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('changePassword')}</label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => onPasswordChange('currentPassword', e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
                placeholder={t('currentPassword')}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {showPasswords.current ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => onPasswordChange('newPassword', e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
                placeholder={t('newPassword')}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {showPasswords.new ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => onPasswordChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
                placeholder={t('confirmNewPassword')}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {showPasswords.confirm ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={onChangePassword}
            disabled={isPasswordChangeDisabled}
            className="mt-3 px-4 py-2 text-blue-400 text-sm rounded hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {t('changePassword')}
          </button>
        </div>
      </div>
    </div>
  );
});

OwnerInfoSection.displayName = 'OwnerInfoSection';

export default OwnerInfoSection; 