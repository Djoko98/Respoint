import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { saveToStorage, loadFromStorage } from '../../utils/storage';
import { useLanguage } from '../../context/LanguageContext';

interface PrinterSettingsSectionProps {}

const PrinterSettingsSection: React.FC<PrinterSettingsSectionProps> = () => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [currentDefault, setCurrentDefault] = useState<string>('');
  const { t } = useLanguage();

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_API__;

  useEffect(() => {
    const stored = loadFromStorage<string>('posPrinterName', '');
    setSelected(stored || '');
    if (!isTauri) return;
    // try to fetch current default
    invoke<string>('get_default_printer')
      .then(name => setCurrentDefault(name))
      .catch(() => setCurrentDefault(''));
  }, [isTauri]);

  const fetchPrinters = async () => {
    if (!isTauri) {
      setError(t('noTableDataAvailable')); // generic small info; section already shows desktop-only note
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<string[]>('list_printers');
      setPrinters(list || []);
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const savePreferred = () => {
    saveToStorage('posPrinterName', selected);
  };

  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l-4 4h3v4h2v-4h3L6 9zm12-4h-3V1h-2v4h-3l4 4 4-4z" />
        </svg>
        {t('posPrinterTitle')}
      </h3>

      {!isTauri && (
        <div className="text-xs text-gray-500 mb-3">{t('desktopOnlyNotice')}</div>
      )}

      {isTauri && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">{t('preferredPosPrinter')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('preferredPosPrinterDescription')}</div>
            </div>
            <button
              onClick={fetchPrinters}
              className="px-3 py-1.5 border border-gray-700 text-gray-300 text-xs rounded hover:bg-gray-800 transition-colors"
              disabled={loading}
            >
              {loading ? t('loading') : t('refreshList')}
            </button>
          </div>

          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
          >
            <option value="">{t('choosePrinterPlaceholder')}</option>
            {printers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={savePreferred}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              disabled={!selected}
            >
              {t('saveAsPreferred')}
            </button>
            {currentDefault && (
              <div className="text-xs text-gray-500">{t('windowsDefaultPrinter')} <span className="text-gray-300">{currentDefault}</span></div>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrinterSettingsSection;
