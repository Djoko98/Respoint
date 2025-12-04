import React, { memo, useContext, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';

interface RestaurantInfoSectionProps {
  formData: {
    restaurantName: string;
    logo: string;
    logoLightUrl: string;
  };
  onInputChange: (field: string, value: string) => void;
  onLogoUpload: (file: File) => Promise<void>;
  onRemoveLogo: () => Promise<void>;
  isUploading: boolean;
  onLightLogoUpload: (file: File) => Promise<void>;
  onRemoveLightLogo: () => Promise<void>;
  isLightLogoUploading: boolean;
}

const RestaurantInfoSection: React.FC<RestaurantInfoSectionProps> = memo(({
  formData,
  onInputChange,
  onLogoUpload,
  onRemoveLogo,
  isUploading,
  onLightLogoUpload,
  onRemoveLightLogo,
  isLightLogoUploading
}) => {
  const { t } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lightFileInputRef = useRef<HTMLInputElement>(null);
  const [logoKey, setLogoKey] = useState(() => Date.now()); // Force re-render of img element
  const [lightLogoKey, setLightLogoKey] = useState(() => Date.now()); // Force re-render of light logo img

  const previewBaseClasses = 'w-24 h-24 rounded border overflow-hidden flex items-center justify-center transition-colors';
  const darkPreviewClasses = `${previewBaseClasses} ${isDarkMode ? 'bg-[#000814] border-gray-800' : 'bg-[#050b16] border-gray-300/40 shadow-sm'}`;
  const lightPreviewClasses = `${previewBaseClasses} ${isDarkMode ? 'bg-[#F3F5F9] border-white/30 shadow-inner' : 'bg-white border-gray-300 shadow-inner'}`;
  const darkPlaceholderTextClass = `${isDarkMode ? 'text-gray-600' : 'text-gray-500'} flex flex-col items-center justify-center`;
  const lightPlaceholderTextClass = `${isDarkMode ? 'text-gray-700' : 'text-gray-500'} flex flex-col items-center justify-center`;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onLogoUpload(file);
      // Update key to force img re-render and avoid cache issues
      setLogoKey(Date.now());
    }
  };

  const handleRemove = async () => {
    await onRemoveLogo();
    // Clear file input and update key
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLogoKey(Date.now());
  };

  // Add timestamp to logo URL to prevent caching issues
  const logoUrl = formData.logo ? `${formData.logo}?t=${logoKey}` : '';
  const logoLightUrl = formData.logoLightUrl ? `${formData.logoLightUrl}?t=${lightLogoKey}` : '';

  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        {t('restaurantInformation')}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('restaurantName')}</label>
          <input
            type="text"
            value={formData.restaurantName}
            onChange={(e) => onInputChange('restaurantName', e.target.value)}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
            placeholder={t('enterRestaurantName')}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('restaurantLogoDark')}</label>
          <div className="flex items-start gap-4">
            <div className={darkPreviewClasses}>
              {logoUrl ? (
                <img 
                  key={logoKey} // Force re-render when key changes
                  src={logoUrl} 
                  alt="Restaurant logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Logo failed to load:', logoUrl);
                    // Fallback to no logo display
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className={darkPlaceholderTextClass}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <p className="text-xs mt-1">{t('noLogo')}</p>
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 text-sm border border-gray-700 text-gray-300 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isUploading ? t('uploading') : t('uploadLogo')}
                </button>
                {formData.logo && (
                  <button
                    onClick={handleRemove}
                    className="px-3 py-1.5 text-sm text-red-400 rounded hover:bg-red-500/10 transition-colors"
                  >
                    {t('removeLogo')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">{t('logoFileDescription')}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('restaurantLogoLight')}</label>
          <div className="flex items-start gap-4">
            <div className={lightPreviewClasses}>
              {logoLightUrl ? (
                <img 
                  key={lightLogoKey}
                  src={logoLightUrl} 
                  alt="Restaurant logo (light theme)" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className={lightPlaceholderTextClass}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <p className="text-xs mt-1">{t('noLogo')}</p>
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={lightFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await onLightLogoUpload(file);
                    setLightLogoKey(Date.now());
                  }
                }}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => lightFileInputRef.current?.click()}
                  disabled={isLightLogoUploading}
                  className="px-3 py-1.5 text-sm border border-gray-700 text-gray-300 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isLightLogoUploading ? t('uploading') : t('uploadLogo')}
                </button>
                {formData.logoLightUrl && (
                  <button
                    onClick={async () => {
                      await onRemoveLightLogo();
                      if (lightFileInputRef.current) {
                        lightFileInputRef.current.value = '';
                      }
                      setLightLogoKey(Date.now());
                    }}
                    className="px-3 py-1.5 text-sm text-red-400 rounded hover:bg-red-500/10 transition-colors"
                  >
                    {t('removeLogo')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">{t('logoFileDescription')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

RestaurantInfoSection.displayName = 'RestaurantInfoSection';

export default RestaurantInfoSection; 