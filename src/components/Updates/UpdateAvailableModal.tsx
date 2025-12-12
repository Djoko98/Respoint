import React, { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import logoImage from '../../assets/logo.png';
import { ThemeContext } from '../../context/ThemeContext';

interface UpdateAvailableModalProps {
  isOpen: boolean;
  version: string;
  notes?: string | null;
  onInstall: () => Promise<void>;
  onLater: () => void;
}

const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  isOpen,
  version,
  notes,
  onInstall,
  onLater,
}) => {
  const { t, currentLanguage } = useLanguage() as any;
  const { theme } = useContext(ThemeContext);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLight = theme === 'light';

  // Keyboard + scroll handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isInstalling) {
          onLater();
        }
      }
      if (e.key === 'Enter' && !isInstalling) {
        void handleInstall();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow || 'unset';
      try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isInstalling]);

  if (!isOpen) return null;

  const handleInstall = async () => {
    setError(null);
    setIsInstalling(true);
    try {
      await onInstall();
    } catch (err: any) {
      console.error('UPDATE MODAL: install failed', err);
      setError(
        currentLanguage === 'srb'
          ? 'Ažuriranje nije uspelo. Pokušajte ponovo ili kasnije.'
          : 'Update failed. Please try again or later.'
      );
      setIsInstalling(false);
    }
  };

  const portalTarget = document.getElementById('app-zoom-root') || document.body;

  const title = t('updateAvailableTitle' as any);
  const body = t('updateAvailableBody' as any);

  const updateNotes = notes && typeof notes === 'string'
    ? notes.trim()
    : '';

  const content = (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[16000] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div
          className={
            isLight
              ? 'relative bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden'
              : 'relative bg-[#0A1929]/90 border border-[#1E2A34] rounded-2xl shadow-2xl overflow-hidden'
          }
        >
          {/* Accent bar */}
          <div
            className={
              isLight
                ? 'absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3B82F6] via-[#F97316] to-[#22C55E]'
                : 'absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3B82F6] via-[#F59E0B] to-[#10B981]'
            }
          />

          <div className="px-8 pt-8 pb-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className={
                  isLight
                    ? 'w-12 h-12 rounded-xl bg-[#F3F4F6] border border-gray-200 flex items-center justify-center'
                    : 'w-12 h-12 rounded-xl bg-[#020617]/80 border border-[#1E2A34] flex items-center justify-center'
                }
              >
                <img
                  src={logoImage}
                  alt="ResPoint Logo"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <div className="flex-1">
                <h2
                  className={
                    isLight
                      ? 'text-xl font-medium text-gray-900 tracking-wide'
                      : 'text-xl font-medium text-white tracking-wide'
                  }
                >
                  {title}
                </h2>
                <p
                  className={
                    isLight
                      ? 'text-sm text-gray-600 mt-1'
                      : 'text-sm text-[#94A3B8] mt-1'
                  }
                >
                  {body}
                </p>
              </div>
            </div>

            {/* Version + notes */}
            <div
              className={
                isLight
                  ? 'bg-[#F9FAFB] rounded-xl border border-gray-200 px-4 py-3 mb-4'
                  : 'bg-[#020617]/50 rounded-xl border border-[#1E2A34] px-4 py-3 mb-4'
              }
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={
                    isLight
                      ? 'text-xs uppercase tracking-wide text-gray-500'
                      : 'text-xs uppercase tracking-wide text-[#64748B]'
                  }
                >
                  {currentLanguage === 'srb' ? 'Nova verzija' : 'New version'}
                </span>
                <span
                  className={
                    isLight
                      ? 'text-sm font-medium text-gray-900'
                      : 'text-sm font-medium text-[#E5E7EB]'
                  }
                >
                  v{version}
                </span>
              </div>
              {updateNotes ? (
                <div className="mt-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  <p
                    className={
                      isLight
                        ? 'text-sm text-gray-700 whitespace-pre-line leading-relaxed'
                        : 'text-sm text-[#CBD5F5] whitespace-pre-line leading-relaxed'
                    }
                  >
                    {updateNotes}
                  </p>
                </div>
              ) : (
                <p
                  className={
                    isLight
                      ? 'mt-1 text-xs text-gray-500'
                      : 'mt-1 text-xs text-[#64748B]'
                  }
                >
                  {currentLanguage === 'srb'
                    ? 'Ovo ažuriranje donosi poboljšanja stabilnosti i performansi.'
                    : 'This update includes stability and performance improvements.'}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                className={
                  isLight
                    ? 'mb-3 px-3 py-2 rounded border border-red-200 bg-red-50 text-xs text-red-600'
                    : 'mb-3 px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-300'
                }
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onLater}
                disabled={isInstalling}
                className={
                  isLight
                    ? 'px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    : 'px-4 py-2 rounded-lg text-sm font-medium text-[#E5E7EB] border border-[#1F2937] hover:bg-[#020617] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                }
              >
                {currentLanguage === 'srb' ? 'Kasnije' : 'Later'}
              </button>
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className={
                  isLight
                    ? 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white !text-white shadow-lg shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
                    : 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-lg shadow-[#1D4ED8]/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
                }
              >
                {isInstalling ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin mr-2" />
                    {currentLanguage === 'srb' ? 'Instalira se...' : 'Installing...'}
                  </>
                ) : (
                  <>
                    {currentLanguage === 'srb' ? 'Ažuriraj sada' : 'Update now'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, portalTarget);
};

export default UpdateAvailableModal;


