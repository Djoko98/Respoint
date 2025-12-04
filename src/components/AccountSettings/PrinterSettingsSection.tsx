import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { saveToStorage, loadFromStorage } from '../../utils/storage';
import { useLanguage } from '../../context/LanguageContext';

interface PrinterSettingsSectionProps {
  printLogoUrl: string;
  onPrintLogoUpload: (file: File) => Promise<void>;
  onRemovePrintLogo: () => Promise<void>;
  isPrintLogoUploading: boolean;
}

const PrinterSettingsSection: React.FC<PrinterSettingsSectionProps> = ({
  printLogoUrl,
  onPrintLogoUpload,
  onRemovePrintLogo,
  isPrintLogoUploading
}) => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [currentDefault, setCurrentDefault] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [isEditingFooter, setIsEditingFooter] = useState<boolean>(true);
  const { t } = useLanguage();
  const printLogoFileInputRef = useRef<HTMLInputElement>(null);
  const [printLogoKey, setPrintLogoKey] = useState(() => Date.now());

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_API__;

  useEffect(() => {
    const stored = loadFromStorage<string>('posPrinterName', '');
    setSelected(stored || '');

    // Load receipt footer text (fallback to legacy 2-line values if present)
    const ft = loadFromStorage<string>('posFooterText', '');
    if (ft && ft.trim().length > 0) {
      setFooterText(ft);
      setIsEditingFooter(false);
    } else {
      const f1 = loadFromStorage<string>('posFooterLine1', 'Hvala na rezervaciji!');
      const f2 = loadFromStorage<string>('posFooterLine2', 'Radujemo se vasoj poseti.');
      const combined = [f1, f2].filter(Boolean).join(' • ');
      setFooterText(combined);
      setIsEditingFooter(combined.trim().length === 0);
    }
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

  const saveFooter = () => {
    saveToStorage('posFooterText', footerText || '');
    setIsEditingFooter(false);
    try { window.dispatchEvent(new CustomEvent('account-settings-changed')); } catch {}
  };

  const handlePrintLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onPrintLogoUpload(file);
    setPrintLogoKey(Date.now());
  };

  const handleRemovePrintLogo = async () => {
    await onRemovePrintLogo();
    if (printLogoFileInputRef.current) {
      printLogoFileInputRef.current.value = '';
    }
    setPrintLogoKey(Date.now());
  };

  const previewPrintLogoUrl = printLogoUrl ? `${printLogoUrl}?t=${printLogoKey}` : '';

  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
      <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l-4 4h3v4h2v-4h3L6 9zm12-4h-3V1h-2v4h-3l4 4 4-4z" />
        </svg>
        {t('posPrinterTitle')}
      </h3>

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
            className="respoint-select"
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

      {/* Print logo (receipt logo) */}
      <div className="mt-6 border-t border-gray-800 pt-6">
        <label className="block text-xs text-gray-500 mb-2">{t('printLogo')}</label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 bg-[#000814] rounded border border-gray-800 overflow-hidden flex items-center justify-center">
            {previewPrintLogoUrl ? (
              <img
                key={printLogoKey}
                src={previewPrintLogoUrl}
                alt="Print logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image on error
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-gray-600 flex flex-col items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                </svg>
                <p className="text-xs mt-1">{t('noPrintLogo')}</p>
              </div>
            )}
          </div>

          <div className="flex-1">
            <input
              ref={printLogoFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handlePrintLogoFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={() => printLogoFileInputRef.current?.click()}
                disabled={isPrintLogoUploading}
                className="px-3 py-1.5 text-sm border border-gray-700 text-gray-300 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isPrintLogoUploading ? t('uploading') : t('uploadLogo')}
              </button>
              {printLogoUrl && (
                <button
                  onClick={handleRemovePrintLogo}
                  className="px-3 py-1.5 text-sm text-red-400 rounded hover:bg-red-500/10 transition-colors"
                >
                  {t('removeLogo')}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {t('printLogoDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Receipt footer customization */}
      <div className="mt-6 border-t border-gray-800 pt-6 space-y-3">
        <div className="text-sm text-white">{t('receiptFooterTitle')}</div>
        {isEditingFooter ? (
          <>
            <textarea
              rows={3}
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={t('footerLine1Label')}
              className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors resize-y min-h-[60px]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={saveFooter}
                className="px-4 py-2 text-sm rounded transition-colors font-medium text-blue-400 hover:bg-blue-500/10"
              >
                {t('saveFooter')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-400">{footerText || '—'}</div>
            <button
              onClick={() => setIsEditingFooter(true)}
              className="px-4 py-2 text-sm rounded transition-colors font-medium text-blue-400 hover:bg-blue-500/10"
            >
              {t('editFooter')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterSettingsSection;
