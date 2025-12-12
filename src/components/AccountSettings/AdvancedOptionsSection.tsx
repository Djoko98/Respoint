import React, { memo } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface AdvancedOptionsSectionProps {
  onExportData: () => void;
  onDeactivateAccount: () => void;
  onCheckForUpdates: () => void;
  updateStatus: 'idle' | 'checking' | 'available' | 'none' | 'error';
  updateVersion: string | null;
}

const AdvancedOptionsSection: React.FC<AdvancedOptionsSectionProps> = memo(({
  onExportData,
  onDeactivateAccount,
  onCheckForUpdates,
  updateStatus,
  updateVersion
}) => {
  const { t } = useLanguage();
  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {t('advancedOptions')}
      </h3>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={onExportData}
            className="px-4 py-2 border border-gray-700 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            {t('exportData')}
          </button>
          <p className="text-xs text-gray-600 mt-2">
            {t('exportDataDescription')}
          </p>
        </div>

        <div>
          <button
            onClick={onCheckForUpdates}
            className="px-4 py-2 border border-gray-700 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={updateStatus === 'checking'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m0 0A7 7 0 0112 5a7 7 0 016.418 4M4.582 9H9m11 11v-5h-.582m0 0A7 7 0 0112 19a7 7 0 01-6.418-4M19.418 15H15" />
            </svg>
            {t('checkForUpdates')}
          </button>
          <p className="text-xs text-gray-600 mt-2">
            {t('checkForUpdatesDescription')}
          </p>
          {updateStatus === 'checking' && (
            <p className="text-xs text-gray-500 mt-1">
              {t('loading')}
            </p>
          )}
          {updateStatus === 'available' && (
            <p className="text-xs text-green-400 mt-1">
              {t('updateAvailableBody')}
              {updateVersion ? ` (v${updateVersion})` : ''}
            </p>
          )}
          {updateStatus === 'none' && (
            <p className="text-xs text-gray-400 mt-1">
              {t('noUpdateBody')}
            </p>
          )}
          {updateStatus === 'error' && (
            <p className="text-xs text-red-400 mt-1">
              {t('updateFailedMessage')}
            </p>
          )}
        </div>

        <div>
          <button
            onClick={onDeactivateAccount}
            className="px-4 py-2 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors"
          >
            {t('deactivateAccount')}
          </button>
          <p className="text-xs text-gray-600 mt-2">
            {t('deactivateAccountDescription')}
          </p>
        </div>
      </div>
    </div>
  );
});

AdvancedOptionsSection.displayName = 'AdvancedOptionsSection';

export default AdvancedOptionsSection; 