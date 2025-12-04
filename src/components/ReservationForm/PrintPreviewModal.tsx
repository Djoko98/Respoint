import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import DirectPrintService from '../../services/directPrintService';
import { loadFromStorage } from '../../utils/storage';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationData: {
    guestName: string;
    date: string;
    time: string;
    numberOfGuests: number;
    tableNumber: string;
    serviceType: string;
    additionalRequirements: string;
    restaurantName?: string;
    restaurantAddress?: string;
    logoUrl?: string;
  };
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  reservationData 
}) => {
  const { t, currentLanguage } = useLanguage();
  const [isPrinting, setIsPrinting] = React.useState(false);
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const cancelButtonClass = isLight
    ? 'px-4 py-2 text-gray-800 text-sm rounded hover:bg-gray-200 transition-colors'
    : 'px-4 py-2 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors';

  if (!isOpen) return null;

  const openBrowserPrintWindow = () => {
    const footerText = loadFromStorage<string>('posFooterText', '');
    const footerHtml = (() => {
      const text = footerText && footerText.trim().length > 0
        ? footerText
        : ['Hvala Vam na rezervaciji i ukazanom poverenju!', 'Radujemo se Vašoj poseti.'].join('\n');
      return text.split(/\r?\n/).map(line => line.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br/>');
    })();
    const locale = currentLanguage === 'srb' ? 'sr-RS' : 'en-GB';

    const printWindow = window.open('', 'PRINT', 'height=600,width=400');
    if (!printWindow) {
      throw new Error('Ne mogu da otvorim prozor za štampu.');
    }

    const css = `
      <style>
        @page { size: 58mm auto; margin: 0; }
        body { margin: 0; padding: 0; }
        .receipt { box-sizing: border-box; width: 384px; margin: 0 auto; padding: 28px; font-family: 'Courier New', monospace; font-size: 20px; color: #000; line-height: 1.7; font-weight: 700; }
        .center { text-align: center; }
        .row { display: flex; justify-content: space-between; }
        .xs { font-size: 18px; }
        .sm { font-size: 20px; }
        .bold { font-weight: bold; }
        .mt1 { margin-top: 8px; }
        .mt2 { margin-top: 12px; }
        .mt3 { margin-top: 16px; }
        .pt2 { padding-top: 12px; }
        .sep { border-top: 1px solid #333; margin: 8px 0; }
        img.logo { display: block; margin: 0 auto 12px; max-width: 100%; max-height: 180px; object-fit: contain; }
      </style>
    `;

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          ${css}
        </head>
        <body>
          <div class="receipt">
            ${reservationData.logoUrl ? `<img class="logo" src="${reservationData.logoUrl}" />` : ''}
            ${reservationData.restaurantName ? `
              <div class="center mt1">
                <div class="bold sm">${reservationData.restaurantName}</div>
                ${reservationData.restaurantAddress ? `<div class="xs">${reservationData.restaurantAddress}</div>` : ''}
              </div>
            ` : ''}
            <div class="sep"></div>
            <div class="center bold" style="font-size:20px;">${t('reservationTitle')}</div>
            <div class="mt2">
              <div class="row xs"><span>${t('guestLabel')}</span><span><b>${reservationData.guestName}</b></span></div>
              <div class="row xs"><span>${t('dateLabel')}</span><span><b>${formatDate(reservationData.date)}</b></span></div>
              <div class="row xs"><span>${t('timeLabel')}</span><span><b>${reservationData.time}</b></span></div>
              <div class="row xs"><span>${t('seatsLabel')}</span><span><b>${reservationData.numberOfGuests}</b></span></div>
              ${reservationData.tableNumber ? `<div class="row xs"><span>${t('tableLabel')}</span><span>${reservationData.tableNumber}</span></div>` : ''}
              ${reservationData.serviceType ? `<div class="row xs"><span>${t('serviceLabel')}</span><span>${reservationData.serviceType}</span></div>` : ''}
            </div>
            ${reservationData.additionalRequirements ? `
              <div class="sep"></div>
              <div class="xs"><div class="bold mt1">${t('notesLabel')}</div>${reservationData.additionalRequirements.replace(/\n/g, '<br/>')}</div>
            ` : ''}
            <div class="sep mt3"></div>
            <div class="center xs">
              ${footerHtml}<br/>
              ${new Date().toLocaleDateString(locale)} ${new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Attempt direct POS print (Tauri). If it throws, fallback to browser print window.
      await DirectPrintService.printReservation(reservationData);
      console.log('✅ Direct print successful (Tauri)');
      onClose();
    } catch (tauriError) {
      try {
        console.warn('Direct print failed or not available, using browser print window. Details:', tauriError);
        openBrowserPrintWindow();
      } catch (browserError) {
        console.error('❌ Print failed:', browserError);
        alert(`Greška prilikom štampanja: ${String(browserError)}`);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black bg-opacity-50 flex items-center justify-center z-[12050]">
      <div className="bg-[#0A1929] rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-light text-white">
            {t('printPreview')}
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

        {/* Print Preview Container */}
        <div className="flex justify-center mb-6 print-area">
          <div className="print-preview bg-white text-black p-4 border border-gray-300 shadow-lg">
            {/* Logo */}
            {reservationData.logoUrl && (
              <img 
                src={reservationData.logoUrl} 
                alt="Restaurant Logo" 
                className="logo block mx-auto mb-2 max-w-full h-auto"
              />
            )}
            
            {/* Restaurant Info */}
            {reservationData.restaurantName && (
              <div className="text-center mb-2">
                <div className="font-bold text-sm uppercase">
                  {reservationData.restaurantName}
                </div>
                {reservationData.restaurantAddress && (
                  <div className="text-xs">
                    {reservationData.restaurantAddress}
                  </div>
                )}
              </div>
            )}
            
            {/* Separator */}
            <div className="text-center mb-2">
              {'='.repeat(32)}
            </div>
            
            {/* Receipt Header */}
            <div className="text-center mb-3">
              <div className="font-bold text-sm">
                {t('reservationTitle')}
              </div>
            </div>
            
            {/* Reservation Details */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>{t('guestLabel')}</span>
                <span>{reservationData.guestName}</span>
              </div>
              
              <div className="flex justify-between">
                <span>{t('dateLabel')}</span>
                <span>{formatDate(reservationData.date)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>{t('timeLabel')}</span>
                <span>{reservationData.time}</span>
              </div>
              
              <div className="flex justify-between">
                <span>{t('seatsLabel')}</span>
                <span>{reservationData.numberOfGuests}</span>
              </div>
              
              {reservationData.tableNumber && (
                <div className="flex justify-between">
                  <span>{t('tableLabel')}</span>
                  <span>{reservationData.tableNumber}</span>
                </div>
              )}
              
              {reservationData.serviceType && (
                <div className="flex justify-between">
                  <span>{t('serviceLabel')}</span>
                  <span>{reservationData.serviceType}</span>
                </div>
              )}
            </div>
            
            {/* Additional Requirements */}
            {reservationData.additionalRequirements && (
              <div className="mt-3 pt-2 border-t border-gray-300">
                <div className="text-xs">
                  <div className="font-bold mb-1">{t('notesLabel')}</div>
                  <div className="whitespace-pre-line text-xs leading-relaxed">
                    {reservationData.additionalRequirements}
                  </div>
                </div>
              </div>
            )}
            
            {/* Footer */}
            <div className="text-center mt-4 pt-2 border-t border-gray-300">
              <div className="text-xs">
                {'='.repeat(32)}
              </div>
              <div className="text-xs mt-1 whitespace-pre-line">
                {(loadFromStorage<string>('posFooterText', 'Hvala vam na rezervaciji!') || 'Hvala vam na rezervaciji!')}
              </div>
              <div className="text-xs">
                {new Date().toLocaleDateString('sr-RS')} {new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className={cancelButtonClass}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`px-4 py-2 text-sm rounded transition-colors font-medium flex items-center gap-2 ${isPrinting ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/10'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
            </svg>
            {isPrinting ? t('loading') : t('print')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal; 