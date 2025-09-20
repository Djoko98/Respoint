import React, { memo } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ContactInfoSectionProps {
  formData: {
    phone: string;
    address: string;
    timezone: string;
  };
  onInputChange: (field: string, value: string) => void;
  timezones: Array<{ value: string; label: string }>;
}

const ContactInfoSection: React.FC<ContactInfoSectionProps> = memo(({
  formData,
  onInputChange,
  timezones
}) => {
  const { t } = useLanguage();
  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {t('contactInformation')}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('phoneNumberLabel')}</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onInputChange('phone', e.target.value)}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
            placeholder={t('enterPhoneNumber')}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('addressLabel')}</label>
          <textarea
            value={formData.address}
            onChange={(e) => onInputChange('address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors resize-none"
            placeholder={t('enterAddress')}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">{t('timezoneLabel')}</label>
          <select
            value={formData.timezone}
            onChange={(e) => onInputChange('timezone', e.target.value)}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

ContactInfoSection.displayName = 'ContactInfoSection';

export default ContactInfoSection; 